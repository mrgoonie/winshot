export namespace config {
	
	export class GDriveConfig {
	    folderId?: string;
	
	    static createFrom(source: any = {}) {
	        return new GDriveConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.folderId = source["folderId"];
	    }
	}
	export class R2Config {
	    accountId?: string;
	    bucket?: string;
	    publicUrl?: string;
	    directory?: string;
	
	    static createFrom(source: any = {}) {
	        return new R2Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.accountId = source["accountId"];
	        this.bucket = source["bucket"];
	        this.publicUrl = source["publicUrl"];
	        this.directory = source["directory"];
	    }
	}
	export class CloudConfig {
	    r2?: R2Config;
	    gdrive?: GDriveConfig;
	
	    static createFrom(source: any = {}) {
	        return new CloudConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.r2 = this.convertValues(source["r2"], R2Config);
	        this.gdrive = this.convertValues(source["gdrive"], GDriveConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class UpdateConfig {
	    checkOnStartup: boolean;
	    skippedVersion?: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.checkOnStartup = source["checkOnStartup"];
	        this.skippedVersion = source["skippedVersion"];
	    }
	}
	export class EditorConfig {
	    padding: number;
	    cornerRadius: number;
	    shadowSize: number;
	    backgroundColor: string;
	    outputRatio: string;
	    showBackground: boolean;
	    inset: number;
	    autoBackground: boolean;
	    insetBackgroundColor?: string;
	    shapeCornerRadius: number;

	    static createFrom(source: any = {}) {
	        return new EditorConfig(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.padding = source["padding"];
	        this.cornerRadius = source["cornerRadius"];
	        this.shadowSize = source["shadowSize"];
	        this.backgroundColor = source["backgroundColor"];
	        this.outputRatio = source["outputRatio"];
	        this.showBackground = source["showBackground"];
	        this.inset = source["inset"];
	        this.autoBackground = source["autoBackground"];
	        this.insetBackgroundColor = source["insetBackgroundColor"];
	        this.shapeCornerRadius = source["shapeCornerRadius"];
	    }
	}
	export class WindowConfig {
	    width: number;
	    height: number;
	
	    static createFrom(source: any = {}) {
	        return new WindowConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.width = source["width"];
	        this.height = source["height"];
	    }
	}
	export class ExportConfig {
	    defaultFormat: string;
	    jpegQuality: number;
	    includeBackground: boolean;
	    autoCopyToClipboard: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ExportConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.defaultFormat = source["defaultFormat"];
	        this.jpegQuality = source["jpegQuality"];
	        this.includeBackground = source["includeBackground"];
	        this.autoCopyToClipboard = source["autoCopyToClipboard"];
	    }
	}
	export class QuickSaveConfig {
	    folder: string;
	    pattern: string;
	
	    static createFrom(source: any = {}) {
	        return new QuickSaveConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.folder = source["folder"];
	        this.pattern = source["pattern"];
	    }
	}
	export class StartupConfig {
	    launchOnStartup: boolean;
	    minimizeToTray: boolean;
	    showNotification: boolean;
	    closeToTray: boolean;
	
	    static createFrom(source: any = {}) {
	        return new StartupConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.launchOnStartup = source["launchOnStartup"];
	        this.minimizeToTray = source["minimizeToTray"];
	        this.showNotification = source["showNotification"];
	        this.closeToTray = source["closeToTray"];
	    }
	}
	export class HotkeyConfig {
	    fullscreen: string;
	    region: string;
	    window: string;
	
	    static createFrom(source: any = {}) {
	        return new HotkeyConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.fullscreen = source["fullscreen"];
	        this.region = source["region"];
	        this.window = source["window"];
	    }
	}
	export class Config {
	    hotkeys: HotkeyConfig;
	    startup: StartupConfig;
	    quickSave: QuickSaveConfig;
	    export: ExportConfig;
	    window: WindowConfig;
	    editor: EditorConfig;
	    update: UpdateConfig;
	    cloud?: CloudConfig;
	    backgroundImages?: string[];
	
	    static createFrom(source: any = {}) {
	        return new Config(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hotkeys = this.convertValues(source["hotkeys"], HotkeyConfig);
	        this.startup = this.convertValues(source["startup"], StartupConfig);
	        this.quickSave = this.convertValues(source["quickSave"], QuickSaveConfig);
	        this.export = this.convertValues(source["export"], ExportConfig);
	        this.window = this.convertValues(source["window"], WindowConfig);
	        this.editor = this.convertValues(source["editor"], EditorConfig);
	        this.update = this.convertValues(source["update"], UpdateConfig);
	        this.cloud = this.convertValues(source["cloud"], CloudConfig);
	        this.backgroundImages = source["backgroundImages"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	
	
	
	
	

}

export namespace main {
	
	export class DisplayBounds {
	    x: number;
	    y: number;
	    width: number;
	    height: number;
	
	    static createFrom(source: any = {}) {
	        return new DisplayBounds(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	        this.width = source["width"];
	        this.height = source["height"];
	    }
	}
	export class GDriveStatus {
	    connected: boolean;
	    email?: string;
	
	    static createFrom(source: any = {}) {
	        return new GDriveStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.connected = source["connected"];
	        this.email = source["email"];
	    }
	}
	export class HotkeyConfig {
	    fullscreen: string;
	    region: string;
	    window: string;
	
	    static createFrom(source: any = {}) {
	        return new HotkeyConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.fullscreen = source["fullscreen"];
	        this.region = source["region"];
	        this.window = source["window"];
	    }
	}
	export class RegionCaptureData {
	    screenshot?: screenshot.CaptureResult;
	    screenX: number;
	    screenY: number;
	    width: number;
	    height: number;
	    scaleRatio: number;
	    physicalW: number;
	    physicalH: number;
	    displayIndex: number;
	
	    static createFrom(source: any = {}) {
	        return new RegionCaptureData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.screenshot = this.convertValues(source["screenshot"], screenshot.CaptureResult);
	        this.screenX = source["screenX"];
	        this.screenY = source["screenY"];
	        this.width = source["width"];
	        this.height = source["height"];
	        this.scaleRatio = source["scaleRatio"];
	        this.physicalW = source["physicalW"];
	        this.physicalH = source["physicalH"];
	        this.displayIndex = source["displayIndex"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SaveImageResult {
	    success: boolean;
	    filePath: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new SaveImageResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.filePath = source["filePath"];
	        this.error = source["error"];
	    }
	}
	export class VirtualScreenBounds {
	    x: number;
	    y: number;
	    width: number;
	    height: number;
	
	    static createFrom(source: any = {}) {
	        return new VirtualScreenBounds(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	        this.width = source["width"];
	        this.height = source["height"];
	    }
	}

}

export namespace screenshot {
	
	export class CaptureResult {
	    width: number;
	    height: number;
	    data: string;
	
	    static createFrom(source: any = {}) {
	        return new CaptureResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.width = source["width"];
	        this.height = source["height"];
	        this.data = source["data"];
	    }
	}

}

export namespace updater {
	
	export class UpdateInfo {
	    available: boolean;
	    currentVersion: string;
	    latestVersion: string;
	    releaseUrl: string;
	    downloadUrl: string;
	    releaseNotes: string;
	    publishedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.available = source["available"];
	        this.currentVersion = source["currentVersion"];
	        this.latestVersion = source["latestVersion"];
	        this.releaseUrl = source["releaseUrl"];
	        this.downloadUrl = source["downloadUrl"];
	        this.releaseNotes = source["releaseNotes"];
	        this.publishedAt = source["publishedAt"];
	    }
	}

}

export namespace upload {
	
	export class UploadResult {
	    success: boolean;
	    publicUrl: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new UploadResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.publicUrl = source["publicUrl"];
	        this.error = source["error"];
	    }
	}

}

export namespace windows {
	
	export class WindowInfo {
	    handle: any;
	    title: string;
	    className: string;
	    x: number;
	    y: number;
	    width: number;
	    height: number;
	
	    static createFrom(source: any = {}) {
	        return new WindowInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.handle = source["handle"];
	        this.title = source["title"];
	        this.className = source["className"];
	        this.x = source["x"];
	        this.y = source["y"];
	        this.width = source["width"];
	        this.height = source["height"];
	    }
	}
	export class WindowInfoWithThumbnail {
	    handle: any;
	    title: string;
	    className: string;
	    x: number;
	    y: number;
	    width: number;
	    height: number;
	    thumbnail: string;
	
	    static createFrom(source: any = {}) {
	        return new WindowInfoWithThumbnail(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.handle = source["handle"];
	        this.title = source["title"];
	        this.className = source["className"];
	        this.x = source["x"];
	        this.y = source["y"];
	        this.width = source["width"];
	        this.height = source["height"];
	        this.thumbnail = source["thumbnail"];
	    }
	}

}

