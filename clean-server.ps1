# PowerShell script to remove all game-related code from server.js
Write-Host "Starting cleanup of server.js..."

$inputFile = "server.js"
$outputFile = "server-cleaned.js"

# Read the entire file
$content = Get-Content $inputFile -Raw

# Define line ranges to remove (based on our analysis)
# We'll process the file line by line and skip game-related sections

$lines = Get-Content $inputFile

$outputLines = New-Object System.Collections.ArrayList
$skipMode = $false
$skipUntilLine = 0
$currentLine = 0

foreach ($line in $lines) {
    $currentLine++
    
    # Check if we're currently in skip mode
    if ($skipMode -and $currentLine -le $skipUntilLine) {
        continue
    } else {
        $skipMode = $false
    }
    
    # Check for section starts that need to be removed
    
    # 1. Remove Keno rate limiter (lines ~276-293)
    if ($line -match "^// Simple in-memory play rate limiter for Keno") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 17
        continue
    }
    
    # 2. Remove Rugged constants and Keno helpers (lines ~2594-2662)
    if ($line -match "^// TEMPORARY: Disable Rugged backend") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 70
        continue
    }
    
    # 3. Remove entire Keno play route (lines ~3290-3547)
    if ($line -match "^// KENO PLAY ROUTE" -or $line -match "^app\.post\('/keno/play'") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 258
        continue
    }
    
    # 4. Remove Keno rounds route (lines ~3549-3558)
    if ($line -match "^// Get recent keno rounds" -or $line -match "^app\.get\('/keno/rounds'") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 10
        continue
    }
    
    # 5. Skip Keno/Plinko/Blackjack/Rugged sections in /api/recent-games (lines ~3581-3728)
    if ($currentLine -ge 3581 -and $currentLine -le 3590 -and $line -match "Fetch Keno games") {
        $skipMode = $true
        $skipUntilLine = 3602
        continue
    }
    
    if ($currentLine -ge 3603 -and $currentLine -le 3610 -and $line -match "Fetch Plinko games") {
        $skipMode = $true
        $skipUntilLine = 3624
        continue
    }
    
    if ($currentLine -ge 3625 -and $currentLine -le 3632 -and $line -match "Fetch Blackjack games") {
        $skipMode = $true
        $skipUntilLine = 3652
        continue
    }
    
    if ($currentLine -ge 3684 -and $currentLine -le 3691 -and $line -match "Fetch Rugged buys") {
        $skipMode = $true
        $skipUntilLine = 3725
        continue
    }
    
    # 6. Remove Keno leaderboard route (lines ~4054-4091)
    if ($line -match "^app\.get\('/keno/leaderboard'") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 38
        continue
    }
    
    # 7. Remove Plinko leaderboard route (lines ~4092-4129)
    if ($line -match "^// PLINKO LEADERBOARD" -or $line -match "^app\.get\('/plinko/leaderboard'") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 38
        continue
    }
    
    # 8. Remove Blackjack leaderboard route (lines ~4130-4167)
    if ($line -match "^// BLACKJACK LEADERBOARD" -or $line -match "^app\.get\('/blackjack/leaderboard'") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 38
        continue
    }
    
    # 9. Remove Keno odds route (lines ~4184-4226)
    if ($line -match "^// KENO ODDS" -or $line -match "^app\.get\('/keno/odds'") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 43
        continue
    }
    
    # 10. Remove Keno paytables route (lines ~4228-4241)
    if ($line -match "^app\.get\('/keno/paytables'") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 14
        continue
    }
    
    # 11. Remove Keno RTP route (lines ~4243-4253)
    if ($line -match "^app\.get\('/keno/rtp'") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 11
        continue
    }
    
    # 12. Remove Wheel routes registration (lines ~4302-4308)
    if ($line -match "^// Register Wheel routes") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 6
        continue
    }
    
    # 13. Remove ensureRuggedInit function (lines ~4310-4365)
    if ($line -match "^// Register Plinko routes" -or $line -match "^async function ensureRuggedInit") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 56
        continue
    }
    
    # 14. Remove Wheel Socket.IO namespace (lines ~4581-4662)
    if ($line -match "^// 🎡 WHEEL GAME SOCKET.IO EVENTS") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 82
        continue
    }
    
    # 15. Remove Rugged helper functions (lines ~4721-4881)
    if ($line -match "^// RUGGED: Meme-coin live game") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 161
        continue
    }
    
    # 16. Remove admin/rugged/consolidate route (lines ~4985+)
    if ($line -match "^app\.post\('/admin/rugged/consolidate'") {
        $skipMode = $true
        $skipUntilLine = $currentLine + 5
        continue
    }
    
    # Update comment in updateHouseStats
    if ($line -match "^// game: 'plinko', 'blackjack'") {
        $null = $outputLines.Add("// game: 'divides'")
        continue
    }
    
    # Skip lines that reference game-specific imports or requires
    if ($line -match "KenoRound|PlinkoGame|BlackjackGame|Rugged|KenoReserve|WheelGameManager|registerWheelRoutes") {
        # Skip import/require lines for game-specific modules
        if ($line -match "^import.*from|^const.*require") {
            continue
        }
    }
    
    # Add the line if we're not skipping
    $null = $outputLines.Add($line)
}

# Write cleaned content
$outputLines | Set-Content $outputFile -Encoding UTF8

Write-Host "Cleanup complete! Output written to $outputFile"
Write-Host "Original lines: $($lines.Count)"
Write-Host "Cleaned lines: $($outputLines.Count)"
Write-Host "Removed lines: $($lines.Count - $outputLines.Count)"
