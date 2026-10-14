from app.models import db

class SystemSetting(db.Model):
    __tablename__ = 'system_settings'

    key = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.Text, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    category = db.Column(db.String(50), default='GENERAL') # GENERAL, THRESHOLDS, TARIFFS, WEATHER

    def to_dict(self):
        return {
            'key': self.key,
            'value': self.value,
            'description': self.description,
            'category': self.category
        }
