# Faculty Annual Appraisal Frontend

React + Vite starter UI for the IIT Dharwad Faculty Annual Performance Appraisal.

## Start

```bash
npm install
npm run dev
```

## Maintainable structure

```text
src/
├── components/
│   ├── common/        # reusable UI controls
│   └── layout/        # topbar, sidebar, navigation
├── data/              # section metadata and initial form state
├── sections/          # one feature component per appraisal section
├── App.jsx            # workflow/state orchestration only
├── main.jsx
└── styles/
    ├── variables.css
    ├── base.css
    ├── layout.css
    ├── buttons.css
    ├── cards.css
    ├── forms.css
    ├── tables.css
    ├── review.css
    ├── innovations.css
    └── responsive.css
```

The source requirement is the IIT Dharwad Annual Faculty Performance Appraisal Report v1-08/26.
