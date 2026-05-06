# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## 🚀 Funcionalidades Principais

- **POS (Ponto de Venda)**: Interface intuitiva para vendas rápidas.
  - Suporte a múltiplos métodos de pagamento: **Dinheiro, M-Pesa, E-Mola e M-Kesh**.
- **Gestão de Stock**: Controle de inventário com alertas de reposição.
- **Relatórios Avançados**: Gráficos de faturação e filtros inteligentes.
  - Filtro por Categoria/Produto (Exclusivo Plano Empresarial).
- **Segurança Enterprise**: Implementação rigorosa de **Row Level Security (RLS)** e Multitenancy para isolamento total de dados entre lojas.

## 🛠️ Tecnologias

- **Frontend**: React, Lucide React, Framer Motion.
- **Backend/DB**: Supabase (PostgreSQL).
- **Auditoria**: Relatório de segurança incluído em `SECURITY_AUDIT.md`.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
