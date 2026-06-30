$ErrorActionPreference = 'Stop'
$toxiproxy = 'http://localhost:8474'
$desabilitado = @{ enabled = $false } | ConvertTo-Json
$habilitado = @{ enabled = $true } | ConvertTo-Json
$vus = if ($env:VUS) { $env:VUS } else { '10000' }

try {
  Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/v1/cache/flush'
  Invoke-RestMethod -Method Post -Uri "$toxiproxy/proxies/redis_proxy" -UserAgent 'toxiproxy-cli' -ContentType 'application/json' -Body $desabilitado
  docker compose --profile load run --rm -e "VUS=$vus" k6 run --summary-export /reports/thundering-herd.json /scripts/thundering-herd.js
} finally {
  Invoke-RestMethod -Method Post -Uri "$toxiproxy/proxies/redis_proxy" -UserAgent 'toxiproxy-cli' -ContentType 'application/json' -Body $habilitado
}
