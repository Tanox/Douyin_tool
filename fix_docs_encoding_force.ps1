# 强制修复文档编码脚本
# 使用更可靠的方法处理乱码文件

function Force-Fix-FileEncoding {
    param(
        [string]$FilePath
    )
    
    try {
        Write-Host "强制修复文件: $FilePath"
        
        # 使用StreamReader尝试不同编码读取
        $encodings = @(
            [System.Text.Encoding]::UTF8,
            [System.Text.Encoding]::GetEncoding(936), # GB2312
            [System.Text.Encoding]::GetEncoding(54936) # GB18030
        )
        
        $content = $null
        foreach ($encoding in $encodings) {
            try {
                $reader = New-Object System.IO.StreamReader($FilePath, $encoding)
                $content = $reader.ReadToEnd()
                $reader.Close()
                break
            } catch {
                # 尝试下一种编码
                continue
            }
        }
        
        if ($content -eq $null) {
            # 如果所有编码都失败，使用默认编码
            $content = Get-Content -Path $FilePath -Raw
        }
        
        # 写入为UTF-8无BOM格式，确保使用LF换行符
        $content = $content -replace "`r`n", "`n" -replace "`r", "`n"
        [System.IO.File]::WriteAllText($FilePath, $content, [System.Text.UTF8Encoding]::new($false))
        
        Write-Host "文件已强制修复: $FilePath"
        return $true
    } catch {
        Write-Host "强制修复文件失败: $FilePath - $_" -ForegroundColor Red
        return $false
    }
}

# 获取所有.md文件
$mdFiles = Get-ChildItem -Path ".\docs" -Filter "*.md" -Recurse

Write-Host "开始强制修复文档编码，共找到 $($mdFiles.Count) 个.md文件"

$successCount = 0
$failureCount = 0

foreach ($file in $mdFiles) {
    if (Force-Fix-FileEncoding -FilePath $file.FullName) {
        $successCount++
    } else {
        $failureCount++
    }
}

Write-Host "强制修复完成! 成功: $successCount, 失败: $failureCount"