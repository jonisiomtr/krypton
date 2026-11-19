#!/bin/bash

# 🔄 SCRIPT DE RESTORE - KRYPTON SaaS
# Autor: Devin
# Data: 16/10/2026
# Uso: ./restore.sh <backup-file.zip>

# ============================================
# CONFIGURAÇÕES
# ============================================

PROJECT_DIR="/path/to/kryptonsaas"
BACKUP_DIR="/path/to/backups"

# ============================================
# VERIFICAÇÕES
# ============================================

# Verificar se foi fornecido arquivo de backup
if [ -z "$1" ]; then
    echo "❌ Erro: Arquivo de backup não fornecido"
    echo "Uso: ./restore.sh <backup-file.zip>"
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/$1"

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Erro: Arquivo de backup não encontrado: $BACKUP_FILE"
    exit 1
fi

# ============================================
# CONFIRMAÇÃO
# ============================================

echo "⚠️  ATENÇÃO: Isso vai substituir os dados atuais!"
echo "Backup: $BACKUP_FILE"
echo ""
read -p "Tem certeza que deseja continuar? (s/N): " confirm

if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
    echo "❌ Restore cancelado"
    exit 0
fi

# ============================================
# PARAR SERVIÇOS
# ============================================

echo "🛑 Parando serviços..."
pm2 stop kryptonsaas || echo "⚠️  PM2 não está rodando"

# ============================================
# CRIAÇÃO DO BACKUP DE SEGURANÇA
# ============================================

echo "📦 Criando backup de segurança antes do restore..."
SAFE_BACKUP="$BACKUP_DIR/pre-restore-$(date +%Y-%m-%d-%H-%M-%S).zip"
./scripts/backup.sh
if [ -f "$BACKUP_DIR/kryptonsaas-backup-*.zip" ]; then
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/kryptonsaas-backup-*.zip | head -1)
    cp "$LATEST_BACKUP" "$SAFE_BACKUP"
    echo "✅ Backup de segurança criado: $SAFE_BACKUP"
fi

# ============================================
# RESTORE
# ============================================

echo "🔄 Restaurando backup: $BACKUP_FILE"

# Criar diretório temporário
TEMP_DIR=$(mktemp -d)
if [ $? -ne 0 ]; then
    echo "❌ Erro: Falha ao criar diretório temporário"
    exit 1
fi

# Extrair backup
echo "📦 Extraindo backup..."
unzip -q "$BACKUP_FILE" -d "$TEMP_DIR" || {
    echo "❌ Erro: Falha ao extrair backup"
    rm -rf "$TEMP_DIR"
    exit 1
}

# ============================================
# VERIFICAÇÃO DE ARQUIVOS
# ============================================

echo "🔍 Verificando arquivos extraídos..."

# Verificar se existe diretório tenants
if [ ! -d "$TEMP_DIR/tenants" ]; then
    echo "⚠️  Aviso: Diretório tenants não encontrado no backup"
fi

# Verificar se existe .env
if [ ! -f "$TEMP_DIR/.env" ]; then
    echo "⚠️  Aviso: Arquivo .env não encontrado no backup"
fi

# ============================================
# COPIAR ARQUIVOS
# ============================================

echo "📂 Copiando arquivos para o projeto..."

# Copiar tenants
if [ -d "$TEMP_DIR/tenants" ]; then
    rm -rf "$PROJECT_DIR/src/tenants"
    cp -r "$TEMP_DIR/tenants" "$PROJECT_DIR/src/"
    echo "  ✅ tenants restaurado"
fi

# Copiar uploads
if [ -d "$TEMP_DIR/uploads" ]; then
    rm -rf "$PROJECT_DIR/uploads"
    cp -r "$TEMP_DIR/uploads" "$PROJECT_DIR/"
    echo "  ✅ uploads restaurado"
fi

# Copiar sessions
if [ -d "$TEMP_DIR/sessions" ]; then
    rm -rf "$PROJECT_DIR/sessions"
    cp -r "$TEMP_DIR/sessions" "$PROJECT_DIR/"
    echo "  ✅ sessions restaurado"
fi

# Copiar .env
if [ -f "$TEMP_DIR/.env" ]; then
    cp "$TEMP_DIR/.env" "$PROJECT_DIR/"
    echo "  ✅ .env restaurado"
fi

# Copiar .env.production
if [ -f "$TEMP_DIR/.env.production" ]; then
    cp "$TEMP_DIR/.env.production" "$PROJECT_DIR/"
    echo "  ✅ .env.production restaurado"
fi

# ============================================
# LIMPEZA
# ============================================

echo "🧹 Limpando diretório temporário..."
rm -rf "$TEMP_DIR"

# ============================================
# REINICIAR SERVIÇOS
# ============================================

echo "🚀 Reiniciando serviços..."
pm2 restart kryptonsaas || echo "⚠️  PM2 não configurado"

# ============================================
# VERIFICAÇÃO FINAL
# ============================================

echo ""
echo "✅ Restore concluído com sucesso!"
echo ""
echo "📊 Informações:"
echo "  Backup: $BACKUP_FILE"
echo "  Projeto: $PROJECT_DIR"
echo "  Backup de segurança: $SAFE_BACKUP"
echo ""
echo "⚠️  Verifique se tudo está funcionando corretamente"
echo "⚠️  Se houver problemas, restore o backup de segurança: $SAFE_BACKUP"

exit 0
