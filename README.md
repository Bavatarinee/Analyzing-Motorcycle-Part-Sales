Overview

This project turns a raw CSV sales dataset into a fully interactive analytics dashboard — no frameworks, no backend, just plain HTML, CSS, and JavaScript running in the browser.

---

Project Structure

```
Analyzing Motorcycle Part Sales/
├── index.html                  # Main dashboard page
├── style.css                   # Dark-mode premium styling
├── app.js                      # Data processing & chart logic
└── revenue_by_product_line.csv # Sales dataset (1,000 records)
```

---

Dataset

| Field | Description |
|-------|-------------|
| `order_number` | Unique order ID |
| `date` | Order date (June – August 2021) |
| `warehouse` | North or Central |
| `client_type` | Retail or Wholesale |
| `product_line` | Category of motorcycle part |
| `quantity` | Units ordered |
| `unit_price` | Price per unit ($) |
| `total` | Total order value ($) |
| `payment` | Cash / Credit card / Transfer |
| `payment_fee` | Fee rate applied |

**1,000 orders** spanning **3 months** across **2 warehouses** and **6 product lines**.

---

Dashboard Sections

| Section | What You'll Find |
|---------|-----------------|
| **Overview** | KPI cards, revenue by product, daily trend, payment mix |
| **Product Lines** | Top performers, grouped bar, radar chart, full data table |
| **Warehouses** | North vs Central comparison, product mix per warehouse |
| **Client Types** | Retail vs Wholesale revenue split and behavior |
| **Payments** | Cash, credit card, transfer usage and revenue impact |
| **Trends** | Monthly area chart, weekly stacked bar, day-of-week polar chart |

---

Filters

Use the top bar to filter all charts simultaneously by:
- **Warehouse** — North / Central
- **Client Type** — Retail / Wholesale
- **Month** — June / July / August

---

Tech Stack

| Technology | Purpose |
|-----------|---------|
| HTML5 | Page structure |
| CSS3 (Vanilla) | Dark-mode UI, animations, responsive layout |
| JavaScript (ES6+) | Data aggregation and interactivity |
| [Chart.js v4.4](https://www.chartjs.org/) | 18+ interactive charts |
| [PapaParse v5.4](https://www.papaparse.com/) | In-browser CSV parsing |
| [Google Fonts](https://fonts.google.com/) | Inter & Outfit typefaces |

> No build tools. No npm. No frameworks. All libraries loaded via CDN.

---

Getting Started

Because the dashboard fetches the CSV file locally, you need to serve it over HTTP (not open directly as a file).

### Option 1 — Node.js http-server (recommended)

```bash
# Install http-server globally (once)
npm install -g http-server

# Run from the project folder
cd "Analyzing Motorcycle Part Sales"
http-server . -p 8088 -o
```

Then open **http://localhost:8088** in your browser.


License

This project is for educational and analytical purposes. Dataset sourced from public motorcycle parts sales records.
