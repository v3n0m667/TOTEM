$ErrorActionPreference = 'Stop'
$source = [IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path)).TrimEnd('\')
$target = Join-Path $env:LOCALAPPDATA 'Sineriz\Sommelier'
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) { throw 'Falta Node.js 20 o posterior. Instalalo una vez en este tótem y vuelve a ejecutar el instalador.' }
$versionText = (& $node.Source --version).Trim().TrimStart('v')
if ([version]$versionText -lt [version]'20.0') { throw "Se requiere Node.js 20 o posterior. Detectado: $versionText" }
if ($source -eq [IO.Path]::GetFullPath($target).TrimEnd('\')) { throw 'Ejecuta el instalador desde la carpeta extraída del ZIP, no desde la carpeta instalada.' }
New-Item -ItemType Directory -Path $target -Force | Out-Null
& robocopy $source $target /E /XD (Join-Path $source 'data') /NFL /NDL /NJH /NJS
if ($LASTEXITCODE -ge 8) { throw "No se pudieron copiar los archivos (robocopy $LASTEXITCODE)." }
$targetData = Join-Path $target 'data'
New-Item -ItemType Directory -Path $targetData -Force | Out-Null
$catalog = Join-Path $targetData 'catalog.json'
Copy-Item (Join-Path $source 'data\catalog.json') $catalog -Force
$launcher = Join-Path $target 'Iniciar-Totem.bat'
if (-not (Test-Path $launcher)) { throw 'No se encontró Iniciar-Totem.bat en el paquete.' }
$shell = New-Object -ComObject WScript.Shell
function New-AppShortcut([string]$path, [string]$targetPath, [string]$workingDirectory) {
  $shortcut = $shell.CreateShortcut($path)
  $shortcut.TargetPath = $targetPath
  $shortcut.WorkingDirectory = $workingDirectory
  $shortcut.Description = 'Sommelier virtual Siñeriz'
  $shortcut.Save()
}
$desktop = [Environment]::GetFolderPath('Desktop')
$startup = [Environment]::GetFolderPath('Startup')
New-AppShortcut (Join-Path $desktop 'Sommelier Siñeriz.lnk') $launcher $target
New-AppShortcut (Join-Path $startup 'Sommelier Siñeriz.lnk') $launcher $target
Write-Host ''
Write-Host 'Instalación lista.' -ForegroundColor Green
Write-Host "Carpeta: $target"
Write-Host 'Se creó un acceso directo en el Escritorio y se iniciará al entrar a Windows con este usuario.'
Write-Host 'Para abrirlo ahora, usa el acceso directo Sommelier Siñeriz.'
