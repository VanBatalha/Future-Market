# 🎬 Future Market - Guia de Atualização de Cache

## Problema Resolvido
As TVs smart estava com cache de vídeo desatualizado, mesmo após fechar e reabrir a aba, porque:
- **Service Worker (SW) da versão anterior** tinha cache muito agressivo
- **Cache API** mantinha vídeos antigos por muito tempo
- **Sem cache busting adequado** para forçar revalidação

## ✅ Correções Implementadas

### 1. **Service Worker Aprimorado** (sw.js)
- Versão atualizada de `v1` → `v2` para limpar cache antigo automaticamente
- Estratégia **network-first com timeout** de 5 segundos para `config.json`
- Limpeza automática de entradas de cache obsoletas
- Suporte melhor a conexões lentas/instáveis

### 2. **Cache Busting Robusto** (index.html)
- Agora usa `?t=` + timestamp + `&r=` + random para cada requisição
- Impossibilita cache agressivo mesmo com network intermediário
- Timeout de 30 segundos para download de vídeos

### 3. **Verificação Agressiva de Updates**
- **Nos primeiros 30 segundos**: verifica updates a cada 5 segundos
- **Quando aba fica visível**: force refresh automático
- **Quando volta online**: verifica updates imediatamente
- **Intervalo normal**: agora 5 minutos (antes 2) para não sobrecarregar

### 4. **Reset Forçado (NEW!)**
- Se uma TV ficar com cache vencido, use:
  ```
  https://seu-dominio.pages.dev/?reset
  ```
- Isso **limpa TODOS os caches** e força sincronização completa

---

## 🚀 Para TVs Que Já Tem Cache Antigo

### Opção 1: **Usuário Final** (mais fácil)
1. Abra o link com `?reset`:
   ```
   https://seu-dominio.pages.dev/?reset
   ```
2. Deixe a página carregar por 30 segundos (verifica 3 vezes)
3. Pronto! Agora tem a versão atualizada

### Opção 2: **Limpeza Manual pelo Navegador**
1. Pressione **F12** (Developer Tools)
2. Vá para **Application → Storage**
3. Clique em "Clear Site Data" ou:
   - Cache Storage: delete `tv-ads-app-v1` e `tv-ads-app-v2`
   - Cookies/Storage: limpe tudo
4. Feche e reabra a aba
5. Recarregue normalmente

### Opção 3: **Limpeza Total da TV** (último recurso)
1. Settings → Apps/Applications
2. Encontre o navegador (Chrome, Samsung Internet, etc.)
3. Limpe Cache e Dados
4. Reabra o link

---

## 📋 Verificação de Atualizações

### Via DevTools (F12)
```javascript
// No console, para verificar versão atual:
localStorage.getItem('appVersion') || 'não registrada'

// Para ver o config.json atual:
fetch('./config.json?t=' + Date.now()).then(r => r.json()).then(c => console.log(c))
```

### Sinais de Sucesso ✨
- ✅ Badge "Novo vídeo pronto — troca ao final..." aparece
- ✅ Ao fim do vídeo, troca para o novo automaticamente
- ✅ Versão muda no `config.json` a cada atualização

---

## 🔄 Fluxo de Deploy com Cloudflare Pages + GitHub

1. **Atualize no GitHub** o `config.json`:
   ```json
   {
     "version": "2026-05-28-NNNNN",  // incremente este número
     "videoUrl": "./video.mp4",      // ou URL do novo vídeo
     ...
   }
   ```

2. **Push para GitHub** (Cloudflare sincroniza automaticamente)

3. **Aguarde 1-2 minutos** para Cloudflare replicar

4. **TVs detectam automaticamente**:
   - Primeiros 30 segundos: 3 verificações rápidas
   - Depois: a cada 5 minutos
   - Troca ao fim do vídeo em exibição

5. **Se TV não pegar**: envie link com `?reset`

---

## 🛠️ Parâmetros Avançados

| Parâmetro | Uso | Exemplo |
|-----------|-----|---------|
| `?reset` | Limpa todos os caches | `site.dev/?reset` |
| `?debug=1` | (Futuro) Ativa logs | `site.dev/?debug=1` |

---

## 📊 Versão Atual

- **Data**: 2026-05-28
- **SW Version**: v2 (auto-cleanup)
- **Refresh Interval**: 5 minutos
- **Aggressive Checks**: 3x nos primeiros 30s

---

## ⚠️ Troubleshooting

### TV não está pegando atualizações
- [ ] Verifique se `config.json` tem `version` diferente
- [ ] Tente `?reset` no link
- [ ] Verifique conexão de internet
- [ ] Reabra navegador completamente (não só a aba)

### Vídeo não toca em loop
- [ ] Verifique `"loop": true` no `config.json`
- [ ] Certifique que `videoUrl` está correto
- [ ] TVs smart às vezes requerem vídeos MP4 H.264

### Badge "Novo vídeo" nunca sai
- [ ] Badge sai automaticamente ao final do vídeo
- [ ] Se preso: `?reset` para sincronizar

---

**Desenvolvido para TV Outdoor - Cloudflare Pages + GitHub**
