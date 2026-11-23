#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(startup_splash_plugin())
        .run(tauri::generate_context!())
        .expect("OceanHub application failed to start");
}

fn startup_splash_plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::new("oceanhub-startup-splash")
        .js_init_script(include_str!("../loading-splash.js"))
        .build()
}
