{
  description = "One-click Bluesky and ATProto backups";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
    in
    flake-utils.lib.eachSystem supportedSystems (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        atproto-backup = pkgs.callPackage ./nix/package.nix { };

        libraries = with pkgs; [
          webkit2gtk_4_1
          gtk3
          cairo
          gdk-pixbuf
          glib
          pango
          openssl
          libsoup_3
          libayatana-appindicator
        ];

        buildTools = with pkgs; [
          pkg-config
          rustPlatform.cargoSetupHook
          cargo
          rustc
          cargo-tauri
          nodejs
          yarn
        ];
      in
      {
        packages = {
          default = atproto-backup;
          atproto-backup = atproto-backup;
        };

        apps = {
          default = flake-utils.lib.mkApp {
            drv = atproto-backup;
            name = "atbackup";
          };
          atproto-backup = self.apps.${system}.default;
        };

        devShells.default = pkgs.mkShell {
          nativeBuildInputs = buildTools;
          buildInputs = libraries;

          shellHook = ''
            export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH"
            export XDG_DATA_DIRS="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS"
          '';
        };
      }
    ) // {
      nixosModules = {
        default = import ./nix/nixos-module.nix self;
        atproto-backup = self.nixosModules.default;
      };

      homeManagerModules = {
        default = import ./nix/home-manager.nix self;
        atproto-backup = self.homeManagerModules.default;
      };

      # Top-level aliases for direct access
      nixosModule = self.nixosModules.default;
      homeManagerModule = self.homeManagerModules.default;
    };
}
