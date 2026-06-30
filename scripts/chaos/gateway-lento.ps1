$ErrorActionPreference = 'Stop'
$toxiproxy = 'http://localhost:8474'
$body = @{
  name = 'latencia_5s'
  type = 'latency'
  stream = 'downstream'
  toxicity = 1
  attributes = @{ latency = 5000; jitter = 0 }
} | ConvertTo-Json

try {
  Invoke-RestMethod -Method Post -Uri "$toxiproxy/proxies/gateway_proxy/toxics" -UserAgent 'toxiproxy-cli' -ContentType 'application/json' -Body $body
  $vus = if ($env:VUS) { $env:VUS } else { '100' }
  $duration = if ($env:DURATION) { $env:DURATION } else { '30s' }
  docker compose --profile load run --rm -e "VUS=$vus" -e "DURATION=$duration" k6 run --summary-export /reports/gateway-lento.json /scripts/gateway-lento.js
} finally {
  Invoke-RestMethod -Method Delete -Uri "$toxiproxy/proxies/gateway_proxy/toxics/latencia_5s" -UserAgent 'toxiproxy-cli' -ErrorAction SilentlyContinue
}
