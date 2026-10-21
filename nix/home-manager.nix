self:
{ config, lib, pkgs, ... }:

let
  cfg = config.programs.atproto-backup;
  srvCfg = config.services.atproto-backup;
  defaultPackage = self.packages.${pkgs.system}.default or pkgs.atproto-backup;
in
{
  options = {
    programs.atproto-backup = {
      enable = lib.mkEnableOption "ATProto Backup - One-click Bluesky and ATProto backups";

      package = lib.mkOption {
        type = lib.types.package;
        default = defaultPackage;
        defaultText = lib.literalExpression "inputs.atproto-backup.packages.\${pkgs.system}.default";
        description = "The atproto-backup package to install.";
      };

      autostart = lib.mkOption {
        type = lib.types.bool;
        default = false;
        description = "Whether to automatically start atproto-backup on graphical login via XDG autostart.";
      };
    };

    services.atproto-backup = {
      enable = lib.mkEnableOption "ATProto Backup background daemon/tray service";

      package = lib.mkOption {
        type = lib.types.package;
        default = cfg.package;
        defaultText = lib.literalExpression "config.programs.atproto-backup.package";
        description = "The atproto-backup package to use for the systemd service.";
      };
    };
  };

  config = lib.mkMerge [
    (lib.mkIf cfg.enable {
      home.packages = [ cfg.package ];

      xdg.configFile."autostart/atproto-backup.desktop" = lib.mkIf cfg.autostart {
        source = "${cfg.package}/share/applications/atbackup.desktop";
      };
    })

    (lib.mkIf srvCfg.enable {
      systemd.user.services.atproto-backup = {
        Unit = {
          Description = "ATProto Backup daemon / tray";
          PartOf = [ "graphical-session.target" ];
          After = [ "graphical-session.target" ];
        };

        Service = {
          ExecStart = "${srvCfg.package}/bin/atbackup";
          Restart = "on-failure";
          RestartSec = 5;
        };

        Install = {
          WantedBy = [ "graphical-session.target" ];
        };
      };
    })
  ];
}
