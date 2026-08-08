{ pkgs }: {
  deps = [
    pkgs.python3
    pkgs.python3Packages.pip
    pkgs.python3Packages.fastapi
    pkgs.python3Packages.uvicorn
    pkgs.python3Packages.pymongo
    pkgs.python3Packages.motor
    pkgs.python3Packages.bcrypt
    pkgs.python3Packages.passlib
    pkgs.python3Packages.pydantic
    pkgs.python3Packages.requests
  ];
}
