package updater

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
)

const (
	GitHubOwner = "mrgoonie"
	GitHubRepo  = "winshot"
	ReleasesURL = "https://api.github.com/repos/" + GitHubOwner + "/" + GitHubRepo + "/releases/latest"
)

// ReleaseInfo contains information about a GitHub release
type ReleaseInfo struct {
	TagName     string `json:"tag_name"`
	Name        string `json:"name"`
	Body        string `json:"body"`
	HTMLURL     string `json:"html_url"`
	PublishedAt string `json:"published_at"`
	Assets      []Asset `json:"assets"`
}

// Asset represents a release asset (downloadable file)
type Asset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}

// UpdateInfo contains update check result
type UpdateInfo struct {
	Available   bool   `json:"available"`
	CurrentVer  string `json:"currentVersion"`
	LatestVer   string `json:"latestVersion"`
	ReleaseURL  string `json:"releaseUrl"`
	DownloadURL string `json:"downloadUrl"`
	ReleaseNotes string `json:"releaseNotes"`
	PublishedAt string `json:"publishedAt"`
}

// CheckForUpdate checks GitHub releases for a newer version
func CheckForUpdate(currentVersion string) (*UpdateInfo, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequest("GET", ReleasesURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("User-Agent", "WinShot-Updater")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch release info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API returned status %d", resp.StatusCode)
	}

	var release ReleaseInfo
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return nil, fmt.Errorf("failed to parse release info: %w", err)
	}

	// Clean version strings (remove 'v' prefix if present)
	latestVer := strings.TrimPrefix(release.TagName, "v")
	currentVer := strings.TrimPrefix(currentVersion, "v")

	// Parse versions using semver
	current, err := semver.NewVersion(currentVer)
	if err != nil {
		return nil, fmt.Errorf("invalid current version: %w", err)
	}

	latest, err := semver.NewVersion(latestVer)
	if err != nil {
		return nil, fmt.Errorf("invalid latest version: %w", err)
	}

	// Find portable exe download URL
	downloadURL := ""
	for _, asset := range release.Assets {
		name := strings.ToLower(asset.Name)
		if strings.HasSuffix(name, ".exe") && !strings.Contains(name, "setup") && !strings.Contains(name, "installer") {
			downloadURL = asset.BrowserDownloadURL
			break
		}
	}

	// If no portable exe found, use the release page URL
	if downloadURL == "" {
		downloadURL = release.HTMLURL
	}

	return &UpdateInfo{
		Available:    latest.GreaterThan(current),
		CurrentVer:   currentVersion,
		LatestVer:    release.TagName,
		ReleaseURL:   release.HTMLURL,
		DownloadURL:  downloadURL,
		ReleaseNotes: release.Body,
		PublishedAt:  release.PublishedAt,
	}, nil
}

// GetDownloadURL returns the GitHub releases page URL
func GetDownloadURL() string {
	return fmt.Sprintf("https://github.com/%s/%s/releases/latest", GitHubOwner, GitHubRepo)
}
