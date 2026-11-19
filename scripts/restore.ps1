# 🔄 SCRIPT DE RESTORE - KRYPTON SaaS (Windows PowerShell)
# Autor: Devin
# Data: 16/10/2026
# Uso: .\restore.ps1 <backup-file.zip>

# ============================================
# CONFIGURAÇÕES
# ============================================

$PROJECT_DIR = "C:\Users\VENDAS\Documents\Documentos\elon musck\2026"
$BACKUP_DIR = "C:\Users\VENDAS\Documents\Documentos\elon musck\2026\backups"

# ============================================
# VERIFICAÇÕES
# ============================================

# Verificar se foi fornecido arquivo de backup
if ($args.Count -eq 0) {
    Write-Host "❌ Erro: Arquivo de backup não fornecido"
    Write-Host "Uso: .\restore.ps1 <backup-file.zip>"
    exit 1
}

$BACKUP_FILE = Join-Path $BACKUP_DIR $args[0]

# Verificar se arquivo existe
if (-not (Test-Path $BACKUP_FILE)) {
    Write-Host "❌ Erro: Arquivo de backup não encontrado: $BACKUP_FILE"
    exit 1
}

# ============================================
# CONFIRMAÇÃO
# ============================================

Write-Host "⚠️  ATENÇÃO: Isso vai substituir os dados atuais!"
Write-Host "Backup: $BACKUP_FILE"
Write-Host ""
$confirm = Read-Host "Tem certeza que deseja continuar? (s/N)"

if ($confirm -ne "s" -and $confirm -ne "S") {
    Write-Host "❌ Restore cancelado"
    exit 0
}

# ============================================
# PARAR SERVIÇOS
# ============================================

Write-Host "🛑 Parando serviços..."
pm2 stop kryptonsaas 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  PM2 não está rodando ou não configurado"
}

# ============================================
# CRIAÇÃO DO BACKUP DE SEGURANÇA
# ============================================

Write-Host "📦 Criando backup de segurança antes do restore..."
$SAFE_BACKUP = "pre-restore-" + (Get-Date -Format "yyyy-MM-dd-HH-mm-ss") + ".zip"
& .\scripts\backup.ps1
if (Test-Path "$BACKUP_DIR\kryptonsaas-backup-*.zip") {
    $LATEST_BACKUP = Get-ChildItem -Path $BACKUP_DIR -Filter "kryptonsaas-backup-*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Copy-Item $LATEST_BACKUP.FullName (Join-Path $BACKUP_DIR $SAFE_BACKUP)
    Write-Host "✅ Backup de segurança criado: $SAFE_BACKUP"
}

# ============================================
# RESTORE
# ============================================

Write-Host "🔄 Restaurando backup: $BACKUP_FILE"

# Criar diretório temporário
$TEMP_DIR = Join-Path $env:TEMP "kryptonsaas-restore-$((Get-Date).Ticks)"
New-Item -ItemType Directory -Path $TEMP_DIR -Force | Out-Null
if (-not (Test-Path $TEMP_DIR)) {
    Write-Host "❌ Erro: Falha ao criar diretório temporário"
    exit 1
}

# Extrair backup
Write-Host "📦 Extraindo backup..."
Expand-Archive -Path $BACKUP_FILE -DestinationPath $TEMP_DIR -Force
if (-not $?) {
    Write-Host "❌ Erro: Falha ao extrair backup"
    Remove-Item -Path $TEMP_DIR -Recurse -Force
    exit 1
}

# ============================================
# VERIFICAÇÃO DE ARQUIVOS
# ============================================

Write-Host "🔍 Verificando arquivos extraídos..."

# Verificar se existe diretório tenants
if (-not (Test-Path (Join-Path $TEMP_DIR "tenants"))) {
    Write-Host "⚠️  Aviso: Diretório tenants não encontrado no backup"
}

# Verificar se existe .env
if (-not (Test-Path (Join-Path $TEMP_DIR ".env"))) {
    Write-Host "⚠️  Aviso: Arquivo .env não encontrado no backup"
}

# ============================================
# COPIAR ARQUIVOS
# ============================================

Write-Host "📂 Copiando arquivos para o projeto..."

# Copiar tenants
if (Test-Path (Join-Path $TEMP_DIR "tenants")) {
    Remove-Item -Path (Join-Path $PROJECT_DIR "src\tenants") -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -Path (Join-Path $TEMP_DIR "tenants") -Destination (Join-Path $PROJECT_DIR "src\") -Recurse -Force
    Write-Host "  ✅ tenants restaurado"
}

# Copiar uploads
if (Test-Path (Join-Path $TEMP_DIR "uploads")) {
    Remove-Item -Path (Join-Path $PROJECT_DIR "uploads") -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -Path (Join-Path $TEMP_DIR "uploads") -Destination $PROJECT_DIR -Recurse -Force
    Write-Host "  ✅ uploads restaurado"
}

# Copiar sessions
if (Test-Path (Join-Path $TEMP_DIR "sessions")) {
    Remove-Item -Path (Join-Path $PROJECT_DIR "sessions") -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -Path (Join-Path $TEMP_DIR "sessions") -Destination $PROJECT_DIR -Recurse -Force
    Write-Host "  ✅ sessions restaurado"
}

# Copiar .env
if (Test-Path (Join-Path $TEMP_DIR ".env")) {
    Copy-Item -Path (Join-Path $TEMP_DIR ".env") -Destination $PROJECT_DIR -Force
    Write-Host "  ✅ .env restaurado"
}

# Copiar .env.production
if (Test-Path (Join-Path $TEMP_DIR ".env.production")) {
    Copy-Item -Path (Join-Path $TEMP_DIR ".env.production") -Destination $PROJECT_DIR -Force
    Write-Host "  ✅ .env.production restaurado"
}

# ============================================
# LIMPEZA
# ============================================

Write-Host "🧹 Limpando diretório temporário..."
Remove-Item -Path $TEMP_DIR -Recurse -Force

# ============================================
# REINICIAR SERVIÇOS
# ============================================

Write-Host "🚀 Reiniciando serviços..."
pm2 restart kryptonsaas 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  PM2 não configurado"
}

# ============================================
# VERIFICAÇÃO FINAL
# ============================================

Write-Host ""
Write-Host "✅ Restore concluído com sucesso!"
Write-Host ""
Write-Host "📊 Informações:"
Write-Host "  Backup: $BACKUP_FILE"
Write-Host "  Projeto: $PROJECT_DIR"
Write-Host "  Backup de segurança: $SAFE_BACKUP"
Write-Host ""
Write-Host "⚠️  Verifique se tudo está funcionando corretamente"
Write-Host "⚠️  Se houver problemas, restore o backup de segurança: $SAFE_BACKUP"

exit 0
