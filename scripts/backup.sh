#!/bin/bash

# 📦 SCRIPT DE BACKUP AUTOMATIZADO - KRYPTON SaaS
# Autor: Devin
# Data: 16/10/2026
# Uso: ./backup.sh

# ============================================
# CONFIGURAÇÕES
# ============================================

# Diretórios
PROJECT_DIR="/path/to/kryptonsaas"
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H-%M-%S)
BACKUP_NAME="kryptonsaas-backup-${DATE}-${TIME}"

# Arquivos e diretórios para backup
BACKUP_LIST=(
    "src/tenants"
    "uploads"
    "sessions"
    ".env"
    ".env.production"
)

# Retenção (dias)
RETENTION_DAYS=30

# ============================================
# FUNÇÕES
# ============================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ERRO: $1" >&2
    exit 1
}

success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1"
}

# ============================================
# VERIFICAÇÕES
# ============================================

log "🚀 Iniciando backup..."

# Verificar se diretório do projeto existe
if [ ! -d "$PROJECT_DIR" ]; then
    error "Diretório do projeto não encontrado: $PROJECT_DIR"
fi

# Verificar se diretório de backup existe
if [ ! -d "$BACKUP_DIR" ]; then
    log "📁 Criando diretório de backup: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR" || error "Falha ao criar diretório de backup"
fi

# Criar diretório temporário
TEMP_DIR=$(mktemp -d)
if [ $? -ne 0 ]; then
    error "Falha ao criar diretório temporário"
fi

# ============================================
# CRIAÇÃO DO BACKUP
# ============================================

log "📦 Criando backup: $BACKUP_NAME"

# Copiar arquivos e diretórios
for item in "${BACKUP_LIST[@]}"; do
    SOURCE="$PROJECT_DIR/$item"
    
    if [ -e "$SOURCE" ]; then
        log "  → Copiando: $item"
        cp -r "$SOURCE" "$TEMP_DIR/" || error "Falha ao copiar: $item"
    else
        log "  ⚠️  Aviso: $item não encontrado, pulando..."
    fi
done

# Criar arquivo ZIP
log "📦 Compactando backup..."
cd "$TEMP_DIR"
zip -r "$BACKUP_DIR/$BACKUP_NAME.zip" . > /dev/null || error "Falha ao compactar backup"

# ============================================
# LIMPEZA
# ============================================

log "🧹 Limpando diretório temporário..."
rm -rf "$TEMP_DIR"

# ============================================
# RETENÇÃO
# ============================================

log "🗑️  Removendo backups antigos (mais de $RETENTION_DAYS dias)..."
find "$BACKUP_DIR" -name "kryptonsaas-backup-*.zip" -mtime +$RETENTION_DAYS -delete

# ============================================
# VERIFICAÇÃO
# ============================================

if [ -f "$BACKUP_DIR/$BACKUP_NAME.zip" ]; then
    SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.zip" | cut -f1)
    success "Backup concluído com sucesso!"
    success "Arquivo: $BACKUP_DIR/$BACKUP_NAME.zip"
    success "Tamanho: $SIZE"
else
    error "Backup não foi criado"
fi

# ============================================
# LOG
# ============================================

log "📊 Informações do backup:"
echo "  Nome: $BACKUP_NAME"
echo "  Data: $DATE"
echo "  Hora: $TIME"
echo "  Tamanho: $SIZE"
echo "  Local: $BACKUP_DIR"

log "✅ Backup finalizado!"

exit 0
