param(
    [string]$Root = "src"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command rg -ErrorAction SilentlyContinue)) {
    # Install ripgrep (Windows examples):
    # winget install BurntSushi.ripgrep.MSVC
    # scoop install ripgrep
    Write-Error "ripgrep (rg) is required."
}

function Write-Section([string]$Title) {
    Write-Host ""
    Write-Host "=== $Title ==="
}

# Unified scan rules:
# 1) Match getService/registerService with and without generic type args
# 2) Match only string-literal calls (single or double quote)
# 3) Print counts and details for follow-up batches
$regexGetService = 'getService(?:<[^>]+>)?\(\s*(?:\x27|\x22)'
$regexRegisterService = 'registerService(?:<[^>]+>)?\(\s*(?:\x27|\x22)'
$regexAsAny = '\bas any\b'

$patterns = @(
    @{ Name = "getService string literals (generic + non-generic)"; Regex = $regexGetService },
    @{ Name = "registerService string literals (generic + non-generic)"; Regex = $regexRegisterService },
    @{ Name = "fixed string: as any"; Regex = $regexAsAny }
)

Write-Host "Scan root: $Root"
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

foreach ($item in $patterns) {
    Write-Section $item.Name
    $output = rg -n --no-heading --glob "*.ts" --glob "*.tsx" $item.Regex $Root 2>$null

    if (-not $output) {
        Write-Host "Count: 0"
        continue
    }

    $lines = @($output)
    Write-Host "Count: $($lines.Count)"
    $lines
}
