{ lib
, rustPlatform
, pkg-config
, wrapGAppsHook3
, glib
, gtk3
, libsoup_3
, webkit2gtk_4_1
, openssl
, libayatana-appindicator
, makeDesktopItem
, copyDesktopItems
}:

rustPlatform.buildRustPackage rec {
  pname = "atproto-backup";
  version = "0.1.5";

  src = lib.cleanSourceWith {
    src = ./..;
    filter = path: type:
      let
        base = baseNameOf path;
      in
        # Exclude version control and transient build artifacts
        !(base == ".git" || base == "target" || base == "node_modules" || base == ".yarn");
  };

  buildAndTestSubdir = "src-tauri";

  cargoLock = {
    lockFile = ../src-tauri/Cargo.lock;
  };

  nativeBuildInputs = [
    pkg-config
    wrapGAppsHook3
    copyDesktopItems
  ];

  buildInputs = [
    glib
    gtk3
    libsoup_3
    webkit2gtk_4_1
    openssl
    libayatana-appindicator
  ];

  desktopItems = [
    (makeDesktopItem {
      name = "atbackup";
      desktopName = "ATBackup";
      comment = "One-click Bluesky and ATProto backups";
      exec = "atbackup";
      icon = "atbackup";
      terminal = false;
      type = "Application";
      categories = [ "Utility" "Archiving" ];
    })
  ];

  postInstall = ''
    install -Dm644 src-tauri/icons/128x128.png $out/share/icons/hicolor/128x128/apps/atbackup.png
    install -Dm644 src-tauri/icons/32x32.png $out/share/icons/hicolor/32x32/apps/atbackup.png
    install -Dm644 src-tauri/icons/icon.png $out/share/icons/hicolor/512x512/apps/atbackup.png
  '';

  meta = with lib; {
    description = "One-click Bluesky and ATProto backups";
    homepage = "https://github.com/Turtlepaw/atproto-backup";
    license = licenses.asl20;
    maintainers = [ ];
    mainProgram = "atbackup";
    platforms = platforms.linux;
  };
}
