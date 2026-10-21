self:
{ config, lib, pkgs, ... }:

let
  cfg = config.programs.atproto-backup;
  defaultPackage = self.packages.${pkgs.system}.default or pkgs.atproto-backup;
in
{
  options.programs.atproto-backup = {
    enable = lib.mkEnableOption "ATProto Backup - One-click Bluesky and ATProto backups";

    package = lib.mkOption {
      type = lib.types.package;
      default = defaultPackage;
      defaultText = lib.literalExpression "inputs.atproto-backup.packages.\${pkgs.system}.default";
      description = "The atproto-backup package to install.";
    };
  };

  config = lib.mkIf cfg.enable {
    environment.systemPackages = [ cfg.package ];
  };
}
