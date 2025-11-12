<#
.SYNOPSIS
修复文档编码为UTF-8无BOM格式并统一换行符为LF

.DESCRIPTION
此脚本将递归处理指定目录下的所有Markdown文件，尝试通过多种编码读取内容，
然后以UTF-8无BOM格式和LF换行符重新写入，以解决文档乱码问题。

.PARAMETER Directory
要处理的目录路径

.PARAMETER FilePattern
文件匹配模式，默认为*.md
#>

function Fix-DocumentEncoding {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Directory,
        
        [string]$FilePattern = "*.md"
    )
    
    # 获取所有匹配的文件
    $files = Get-ChildItem -Path $Directory -Filter $FilePattern -Recurse -File
    $totalFiles = $files.Count
    $fixedFiles = 0
    $failedFiles = 0
    $failedList = @()
    
    Write-Host "开始处理文档编码，共找到 $totalFiles 个文件..."
    
    foreach ($file in $files) {
        Write-Host "处理文件: $($file.FullName)"
        
        try {
            # 尝试使用多种编码读取文件
            $encodings = @(
                [System.Text.Encoding]::UTF8,
                [System.Text.Encoding]::GetEncoding(936),  # GB2312
                [System.Text.Encoding]::GetEncoding(54936), # GB18030
                [System.Text.Encoding]::Default
            )
            
            $content = $null
            $success = $false
            
            foreach ($encoding in $encodings) {
                try {
                    $content = [System.IO.File]::ReadAllText($file.FullName, $encoding)
                    # 简单验证内容是否可能正确（包含常见的Markdown元素）
                    if ($content -match '^#|^---|\[|\]|```|\*\*\*') {
                        $success = $true
                        break
                    }
                } catch {
                    Write-Host "  尝试编码 $($encoding.WebName) 失败"
                }
            }
            
            if (-not $success) {
                # 如果无法确定正确编码，尝试二进制读取并强制转换
                $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
                $content = [System.Text.Encoding]::UTF8.GetString($bytes)
                Write-Host "  强制使用UTF-8解码"
            }
            
            # 统一换行符为LF
            $content = $content -replace "\r\n", "\n" -replace "\r", "\n"
            
            # 以UTF-8无BOM格式写入
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.UTF8Encoding]::new($false))
            
            $fixedFiles++
            Write-Host "  ✅ 修复成功"
        } catch {
            $failedFiles++
            $failedList += $file.FullName
            Write-Host "  ❌ 修复失败: $_"
        }
    }
    
    # 输出统计信息
    Write-Host "`n编码修复完成！"
    Write-Host "总计: $totalFiles 个文件"
    Write-Host "成功: $fixedFiles 个文件"
    Write-Host "失败: $failedFiles 个文件"
    
    if ($failedList.Count -gt 0) {
        Write-Host "`n失败文件列表:"
        $failedList | ForEach-Object { Write-Host "- $_" }
    }
}

# 处理docs目录
Fix-DocumentEncoding -Directory ".\docs"
