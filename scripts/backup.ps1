# 📦 SCRIPT DE BACKUP AUTOMATIZADO - KRYPTON SaaS (Windows PowerShell)
# Autor: Devin
# Data: 16/10/2026
# Uso: .\backup.ps1

# ============================================
# CONFIGURAÇÕES
# ============================================

# Diretórios
$PROJECT_DIR = "C:\Users\VENDAS\Documents\Documentos\elon musck\2026"
$BACKUP_DIR = "C:\Users\VENDAS\Documents\Documentos\elon musck\2026\backups"
$DATE = Get-Date -Format "yyyy-MM-dd"
$TIME = Get-Date -Format "HH-mm-ss"
$BACKUP_NAME = "kryptonsaas-backup-$DATE-$TIME"

# Arquivos e diretórios para backup
$BACKUP_LIST = @(
    "src\tenants",
    "uploads",
    "sessions",
    ".env",
    ".env.production"
)

# Retenção (dias)
$RETENTION_DAYS = 30

# ============================================
# FUNÇÕES
# ============================================

function Log {
    param([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $message"
}

function Error {
    param([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] ❌ ERRO: $message" -ForegroundColor Red
    exit 1
}

function Success {
    param([string]$message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] ✅ $message" -ForegroundColor Green
}

# ============================================
# VERIFICAÇÕES
# ============================================

Log "🚀 Iniciando backup..."

# Verificar se diretório do projeto existe
if (-not (Test-Path $PROJECT_DIR)) {
    Error "Diretório do projeto não encontrado: $PROJECT_DIR"
}

# Verificar se diretório de backup existe
if (-not (Test-Path $BACKUP_DIR)) {
    Log "📁 Criando diretório de backup: $BACKUP_DIR"
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    if ($?) {
        Success "Diretório de backup criado"
    } else {
        Error "Falha ao criar diretório de backup"
    }
}

# Criar diretório temporário
$TEMP_DIR = Join-Path $env:TEMP "kryptonsaas-backup-$DATE-$TIME"
New-Item -ItemType Directory -Path $TEMP_DIR -Force | Out-Null
if (-not (Test-Path $TEMP_DIR)) {
    Error "Falha ao criar diretório temporário"
}

# ============================================
# CRIAÇÃO DO BACKUP
# ============================================

Log "📦 Criando backup: $BACKUP_NAME"

# Copiar arquivos e diretórios
foreach ($item in $BACKUP_LIST) {
    $SOURCE = Join-Path $PROJECT_DIR $item
    
    if (Test-Path $SOURCE) {
        Log "  → Copiando: $item"
        Copy-Item -Path $SOURCE -Destination $TEMP_DIR -Recurse -Force
        if (-not $?) {
            Error "Falha ao copiar: $item"
        }
    } else {
        Log "  ⚠️  Aviso: $item não encontrado, pulando..."
    }
}

# Criar arquivo ZIP
Log "📦 Compactando backup..."
$ZIP_FILE = Join-Path $BACKUP_DIR "$BACKUP_NAME.zip"
Compress-Archive -Path "$TEMP_DIR\*" -DestinationPath $ZIP_FILE -Force
if (-not (Test-Path $ZIP_FILE)) {
    Error "Falha ao compactar backup"
}

# ============================================
# LIMPEZA
# ============================================

Log "🧹 Limpando diretório temporário..."
Remove-Item -Path $TEMP_DIR -Recurse -Force

# ============================================
# RETENÇÃO
# ============================================

Log "🗑️  Removendo backups antigos (mais de $RETENTION_DAYS dias)..."
$CUTOFF_DATE = (Get-Date).AddDays(-$RETENTION_DAYS)
Get-ChildItem -Path $BACKUP_DIR -Filter "kryptonsaas-backup-*.zip" | Where-Object {
    $_.LastWriteTime -lt $CUTOFF_DATE
} | Remove-Item -Force

# ============================================
# VERIFICAÇÃO
# ============================================

if (Test-Path $ZIP_FILE) {
    $SIZE = (Get-Item $ZIP_FILE).Length / 1MB
    $SIZE_MB = [math]::Round($SIZE, 2)
    Success "Backup concluído com sucesso!"
    Success "Arquivo: $ZIP_FILE"
    Success "Tamanho: $SIZE_MB MB"
} else {
    Error "Backup não foi criado"
}

# ============================================
# LOG
# ============================================

Log "📊 Informações do backup:"
Write-Host "  Nome: $BACKUP_NAME"
Write-Host "  Data: $DATE"
Write-Host "  Hora: $TIME"
Write-Host "  Tamanho: $SIZE_MB MB"
Write-Host "  Local: $BACKUP_DIR"

Log "✅ Backup finalizado!"

exit 0
