# 修复文档编码脚本
# 将所有.md文件转换为UTF-8无BOM格式，统一换行符为LF

function Fix-FileEncoding {
    param(
        [string]$FilePath
    )
    
    try {
        Write-Host "处理文件: $FilePath"
        
        # 读取文件内容
        $content = Get-Content -Path $FilePath -Raw
        
        # 写入为UTF-8无BOM格式，换行符为LF
        [System.IO.File]::WriteAllText($FilePath, $content, [System.Text.UTF8Encoding]::new($false))
        
        Write-Host "文件已修复: $FilePath"
        return $true
    } catch {
        Write-Host "处理文件失败: $FilePath - $_" -ForegroundColor Red
        return $false
    }
}

# 获取所有.md文件
$mdFiles = Get-ChildItem -Path ".\docs" -Filter "*.md" -Recurse

Write-Host "开始修复文档编码，共找到 $($mdFiles.Count) 个.md文件"

$successCount = 0
$failureCount = 0

foreach ($file in $mdFiles) {
    if (Fix-FileEncoding -FilePath $file.FullName) {
        $successCount++
    } else {
        $failureCount++
    }
}

Write-Host "修复完成! 成功: $successCount, 失败: $failureCount"