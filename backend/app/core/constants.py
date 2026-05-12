from enum import Enum

# User Roles
class UserRole(str, Enum):
    MANAGER = "manager"
    ANALYST = "analyst"
    DIRECTOR = "director"
    CHECKER = "checker"
    ADMIN_NSI = "admin_nsi"


# Calculation Status
class CalculationStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    ARCHIVED = "archived"


# Expense Categories
class ExpenseCategory(str, Enum):
    MZH = "МЖС"
    WATER_TECH = "Вода техническая"
    FUEL = "Топливо"
    CLEANING = "Мойка и уборка"
    SANITATION = "Дезинфекция"
    DERATIZATION = "Дератизация"
    DISINSECTION = "Дезинсекция"
    RENT = "Аренда/Амортизация"
    STAFF_CAR = "ТО автомобиля"
    LINEN = "Постельное белье"
    DRINKING_WATER = "Вода питьевая"
    SUPPLIES = "Расходники"
    INVENTORY = "Инвентарь"


# Anomaly Severity
class AnomalySeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# Audit Actions
class AuditAction(str, Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    APPROVE = "approve"
    REJECT = "reject"
    SUBMIT = "submit"
    EXPORT = "export"


# Audit Entity Types
class AuditEntityType(str, Enum):
    CALCULATION = "calculation"
    TARIFF = "tariff"
    USER = "user"
    TRAIN = "train"
    AUDIT_LOG = "audit_log"
    CLAIM_EXPENSE = "claim_expense"


# Route Types
class RouteType(str, Enum):
    COMMERCIAL = "commercial"
    SOCIAL = "social"
    INTERNATIONAL = "international"


# Train Types
class TrainType(str, Enum):
    TALGO = "talgo"
    STANDARD = "standard"
    STADLER = "stadler"
    CKR = "CKR"


# KTZ Branches
KTZ_BRANCHES = [
    "Астана",
    "Алматы",
    "Шымкент",
    "Караганда",
    "Актобе",
    "Атырау",
    "Уральск",
    "Костанай",
    "Павлодар",
    "Петропавловск",
    "Кызылорда",
    "Семей",
]


# Default Values
DEFAULT_ANOMALY_THRESHOLD = 10  # percent
FORECASTING_LOOKBACK_MONTHS = 24
FORECASTING_FORECAST_MONTHS = 3
ML_MODEL_RETRAINING_FREQUENCY_DAYS = 7
