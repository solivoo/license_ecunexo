# EcuNexo Frontend Guidelines & UI/UX Standards

When creating or modifying UI components, views, layouts, or styles in this repository:

1. **Leverage glubox for atomic components**:
   - Use `glubox` for `Button`, `TextBox`, `Select`, `Popup`, `Toast`, `DataGrid`, `RangeDateBox`, `ColorPicker`, `FileBox`, and `Sidebar`.
2. **Apply Google Material Design 3 (M3) + Modern Enterprise SaaS patterns**:
   - Organize pages using standard layouts: `PageHeader` (title, badge, lead, action buttons) -> KPI / `StatCard` strip -> `SectionCard` containers -> `DataGrid` with toolbars.
   - Avoid plain or flat screens with isolated tables or links.
   - Use semantic design tokens: `var(--glb-surface)`, `var(--shell-border)`, `var(--shell-primary)`, `var(--glb-text)`, `var(--glb-muted)`.
   - Implement elegant empty states and loading skeletons instead of bare empty tables.
   - Support dark mode (`html.sf-dark-mode`) seamlessly with subtle translucent borders (`rgba(255,255,255,0.08)`) and soft contrast.
3. **Follow Semantic Versioning & Multi-file Sync**:
   - Follow the `ecunexo-versioning` skill (`.agents/skills/ecunexo-versioning/SKILL.md`) whenever releasing new features, modules, or bug fixes.
   - Keep `VERSION`, `docker-compose.yml`, `deploy/docker-compose.yml`, `deploy/.env.example`, `package.json`, and Git tags strictly synchronized.
