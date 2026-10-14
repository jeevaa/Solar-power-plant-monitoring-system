# Solar Power Plant Monitoring and Performance Analysis System

An industrial-grade SCADA web platform engineered for Electrical & Electronics Engineering (EEE) academic project submission and industrial solar power plant asset management.

![Platform Status](https://img.shields.io/badge/Status-Fully%20Functional-10B981?style=for-the-badge)
![Standard Compliance](https://img.shields.io/badge/Standard-IEC%2061724%20Compliant-0284C7?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-React%2019%20%7C%20Flask%20%7C%20SQLAlchemy%20%7C%20ReportLab-0F172A?style=for-the-badge)

---

## 1. Project Overview & Objectives

The **Solar Power Plant Monitoring and Performance Analysis System** is a centralized control and telemetry analytics platform designed for solar plant operators, maintenance engineers, energy analysts, and grid managers.

### Key Capabilities:
- **Real-Time Generation Monitoring:** Real-time tracking of DC voltage, DC current, DC power, 3-phase AC voltage, line current, inverter conversion efficiency, and grid frequency (50/60 Hz).
- **Physical Solar Simulation (Mode A):** Deterministic diurnal solar radiation physics incorporating celestial sun position, passing cloud attenuation, ambient temperature, and PV cell thermal derating.
- **Hardware Integration API (Mode B):** Secure IoT gateway endpoint (`/api/live/ingest`) for receiving physical Modbus RTU/TCP telemetry.
- **IEC 61724 Performance Ratio (PR) & Yield Analytics:** Accurate calculation of Specific Yield ($kWh/kWp$), Reference Solar Irradiation ($H_i$), Performance Ratio ($PR$), and True DC Panel Efficiency ($\eta$).
- **Composite Trapezoidal Energy Integration:** Numerical integration of instantaneous power ($\int P(t) dt$) with telemetry gap rejection (&gt;30 min), preventing energy inflation.
- **8-Rule SCADA Fault Detection Engine:** Automated real-time rule engine detecting low generation, thermal anomalies, MPPT voltage collapse, grid deviations, and telemetry latency with deduplication cooldown.
- **Dual-Tariff Economic Valuation:** Financial model distinguishing self-consumption bill reduction from grid export compensation.
- **ReportLab PDF Reports & CSV Export:** Downloadable formal engineering audit reports.

---

## 2. Mathematical & Physics Models Implemented

### A. PV Cell Thermal & Diurnal Model (NOCT)
PV cell operating temperature deviates above ambient temperature under incident solar irradiance:
$$T_{cell} = T_{amb} + \left( \frac{\text{NOCT} - 20}{800} \right) \cdot G$$
Where:
- $T_{amb}$ = Ambient air temperature (°C)
- $\text{NOCT}$ = Nominal Operating Cell Temperature (typically 45°C)
- $G$ = Incident solar plane-of-array irradiance ($W/m^2$)

Thermal power derating:
$$P_{expected} = P_{STC} \cdot \left(\frac{G}{1000}\right) \cdot \left[1 + \gamma \cdot (T_{cell} - 25)\right] \cdot \eta_{inv} \cdot \eta_{system}$$
Where $\gamma \approx -0.38\% / ^\circ C$ is the temperature coefficient for crystalline silicon.

### B. Energy Generation via Numerical Integration
Energy in kilowatt-hours (kWh) is the time integral of instantaneous active power:
$$E = \sum_{i=1}^{N-1} \frac{P_i + P_{i+1}}{2} \cdot \left( \frac{t_{i+1} - t_i}{3600} \right)$$
*Data Gap Rejection:* If $\Delta t = t_{i+1} - t_i > 1800\text{ seconds}$ (30 minutes), the interval is treated as an outage and not interpolated.

### C. Specific Yield ($Y_f$)
Normalized production metric independent of plant capacity:
$$Y_f = \frac{E_{AC}\text{ (kWh)}}{P_{DC,STC}\text{ (kWp)}}\quad \left[\frac{\text{kWh}}{\text{kWp}}\right]$$

### D. Performance Ratio ($PR$) per IEC 61724
Evaluates total system losses (thermal, soiling, inverter clipping, cabling resistance):
$$PR = \frac{Y_f}{Y_r} = \frac{E_{AC}\text{ (kWh)}}{P_{DC,STC}\text{ (kWp)} \times H_i\text{ (kWh/m}^2\text{)}} \times 100\%$$
Where $H_i = \int \frac{G(t)}{1000} dt$ represents Reference Yield ($Y_r$ in Peak Sun Hours).

### E. PV Module Conversion Efficiency ($\eta$)
Evaluates true DC electrical output against coincident optical irradiance:
$$\eta = \frac{P_{DC}\text{ (W)}}{G\text{ (W/m}^2\text{)} \times A_{array}\text{ (m}^2\text{)}} \times 100\%$$

### F. Economic Benefit Formulation
$$\text{Self-Consumed Energy (kWh)} = E_{total} \times f_{self}$$
$$\text{Self-Consumption Savings} = \text{Self-Consumed Energy} \times \text{Retail Tariff}$$
$$\text{Exported Energy (kWh)} = E_{total} - \text{Self-Consumed Energy}$$
$$\text{Export Credit} = \text{Exported Energy} \times \text{Feed-in Tariff}$$
$$\text{Total Net Benefit} = \text{Self-Consumption Savings} + \text{Export Credit}$$

---

## 3. Automated 8-Rule SCADA Fault Engine

| Rule ID | Anomaly Name | Trigger Threshold | Physical Rationale |
|---|---|---|---|
| **RULE-1** | Low Power Generation | $P_{AC} < P_{expected} \times 65\%$ ($G > 150 W/m^2$) | Identifies partial shading, blown DC string fuses, or heavy soiling. Suppressed at night. |
| **RULE-2** | Inverter Offline | Heartbeat timeout &gt; 300s or status OFFLINE | Detects internal inverter IGBT trips, contactor drops, or RS-485 bus faults. |
| **RULE-3** | Abnormal Cell Temperature | $T_{cell} > 65.0^\circ C$ (Warning), $> 75.0^\circ C$ (Critical) | Detects cell hotspots, bypass diode failure, or airflow obstructions. |
| **RULE-4** | DC Voltage Out of Range | $V_{DC} < 450V$ or $> 880V$ during daylight | Detects MPPT tracker decoupling or string open-circuit faults. |
| **RULE-5** | AC Output / Grid Anomaly | $V_{AC} \notin [380, 445V]$ or $f \notin [49.2, 50.8Hz]$ | Enforces IEEE 1547 / IEC 61727 utility interconnection safety standards. |
| **RULE-6** | Sub-Target Daily Yield | Daily $kWh < 2.8 kWh/kWp$ evaluated after 16:00 | Catches cumulative seasonal underperformance or persistent cloudy days. |
| **RULE-7** | Telemetry Feed Latency | Packet lag &gt; 600 seconds in Mode B | Identifies IoT gateway Wi-Fi / cellular dropouts. |
| **RULE-8** | Depressed PR Index | Instantaneous $PR < 55\%$ during peak irradiance | Highlights severe soiling layers (dust, bird droppings, sand). |

---

## 4. Default Seeded Accounts & Credentials

The database comes pre-seeded with 3 authenticated personas:

| Role | Email Address | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@solarplant.io` | `Admin@123` | Full control: plants CRUD, tariffs, thresholds, user management. |
| **Plant Operator** | `operator@solarplant.io` | `Operator@123` | Operational: acknowledge/resolve alarms, work orders, PDF reports. |
| **Energy Analyst / Viewer** | `viewer@solarplant.io` | `Viewer@123` | Read-only: view telemetry, analytics, PR indices, preview reports. |

*Quick Access:* The login screen includes **1-click instant login buttons** for all three roles.

---

## 5. Technology Stack

### Frontend
- **React 19** & **Vite 6**
- **Tailwind CSS v4** (Industrial navy & emerald theme)
- **React Router v7**
- **Recharts** (Diurnal generation curves, 30-day bars, PR trends, time-of-day lines, economic pies)
- **Lucide React** (Industrial iconography)
- **Axios** (JWT interceptor with auto-refresh and 401 handling)

### Backend
- **Python 3.11** & **Flask**
- **Flask-SQLAlchemy** & **PyMySQL** (MySQL 8 support + local SQLite development fallback)
- **Flask-JWT-Extended** (Role-Based Access Control)
- **ReportLab** (Official PDF report generation)
- **Pandas & NumPy** (Numerical integration & statistical grouping)
- **Requests** (Open-Meteo external weather API client with in-memory caching)

---

## 6. Project Directory Structure

```
solar power plant monitoring system/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory, CORS, JWT, Blueprints
│   │   ├── config.py            # Environment config (MySQL/SQLite, JWT, Open-Meteo)
│   │   ├── models/              # SQLAlchemy Database Models
│   │   │   ├── user.py          # User (Admin, Operator, Viewer)
│   │   │   ├── plant.py         # SolarPlant, Inverter
│   │   │   ├── reading.py       # GenerationReading (telemetry records)
│   │   │   ├── weather.py       # WeatherRecord
│   │   │   ├── alert.py         # Alert, AlertRule
│   │   │   ├── maintenance.py   # MaintenanceTask
│   │   │   └── settings.py      # SystemSetting
│   │   ├── services/            # Core Engineering Logic
│   │   │   ├── simulation_service.py # Deterministic physical solar model
│   │   │   ├── calculations.py  # Specific Yield, PR, Efficiency, Availability
│   │   │   ├── weather_service.py # Open-Meteo integration & cache fallback
│   │   │   ├── fault_engine.py  # 8 SCADA rules engine with deduplication
│   │   │   ├── savings_service.py # Dual-tariff economic calculations
│   │   │   └── report_service.py # ReportLab PDF & CSV generator
│   │   ├── routes/              # RESTful API Endpoints
│   │   │   ├── auth.py, plants.py, live.py, analytics.py, weather.py,
│   │   │   ├── performance.py, faults.py, alerts.py, savings.py,
│   │   │   └── reports.py, maintenance.py, settings.py
│   │   └── utils/
│   │       ├── auth_helpers.py  # RBAC decorators (@admin_required, @operator_required)
│   │       ├── math_helpers.py  # Composite trapezoidal energy integration
│   │       └── seeder.py        # 30-day realistic historical seed generator
│   ├── run.py                   # Flask server entry point (Port 5001)
│   ├── seed.py                  # Standalone CLI database seeder
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # Local environment configuration
│   └── .env.example             # Documented template
├── frontend/
│   ├── src/
│   │   ├── api/client.js        # Axios instance with JWT auth headers
│   │   ├── context/             # AuthContext, PlantContext
│   │   ├── components/layout/   # Navbar, Sidebar (13 links), Layout
│   │   ├── components/ui/       # StatCard, StatusBadge, Modal, LoadingSpinner
│   │   └── pages/               # 14 Full SCADA Pages
│   ├── package.json
│   ├── vite.config.js           # Reverse proxy to http://127.0.0.1:5001
│   └── index.html
├── start.sh                     # One-click launch script
└── README.md
```

---

## 7. Installation & Quick Start

### Quick Launch (Recommended)
Run the automated launcher script from the project root:
```bash
./start.sh
```
This automatically initializes the virtual environment, verifies database tables, starts the Flask API on port `5001`, and opens the Vite frontend on `http://localhost:5173`.

---

### Manual Step-by-Step Setup

#### Step 1: Backend Setup
```bash
cd backend

# Create virtual environment (Python 3.10+)
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run initial database seeder
python seed.py

# Start Flask backend server (Port 5001)
python run.py
```

#### Step 2: Frontend Setup
In a new terminal window:
```bash
cd frontend

# Install Node modules
npm install

# Start Vite development server
npm run dev
```

Open your browser to: **`http://localhost:5173`**

---

## 8. Database Configuration (MySQL 8 or SQLite)

The platform supports both **MySQL 8** (production utility deployment) and **SQLite** (instant zero-configuration local development).

To use MySQL 8, configure `backend/.env`:
```env
DATABASE_URL=mysql+pymysql://root:yourpassword@localhost:3306/solar_monitoring
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=yourpassword
MYSQL_DB=solar_monitoring
```

---

## 9. Hardware Ingestion API (Mode B Test)

To push measurements from an external physical gateway (ESP32, Raspberry Pi, Modbus TCP gateway):

```bash
curl -X POST http://localhost:5001/api/live/ingest \
  -H "Content-Type: application/json" \
  -H "X-Plant-Key: <PLANT_API_KEY>" \
  -d '{
    "dc_voltage": 650.5,
    "dc_current": 1250.2,
    "ac_voltage": 415.0,
    "ac_power_kw": 795.5,
    "solar_irradiance_w_m2": 880.0,
    "panel_temperature_c": 45.2,
    "ambient_temperature_c": 32.5,
    "grid_frequency_hz": 50.02
  }'
```

---

## 10. License & Academic Citation

Developed for Electrical & Electronics Engineering (EEE) academic project requirements. Incorporates international photovoltaic engineering standards (IEC 61724, IEEE 1547).
