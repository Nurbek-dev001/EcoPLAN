"""add branch to users and calculations, create claim_expenses

Revision ID: 002
Revises: 001_initial
Create Date: 2025-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add branch to users
    op.add_column('users', sa.Column('branch', sa.String, nullable=True))
    op.add_column('users', sa.Column('full_name', sa.String, nullable=True))

    # Add branch to calculations
    op.add_column('calculations', sa.Column('branch', sa.String, nullable=True))
    op.add_column('calculations', sa.Column('anomaly_explanation', sa.Text, nullable=True))

    # Create claim_expenses table
    op.create_table(
        'claim_expenses',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('bin', sa.String(12), nullable=False, index=True),
        sa.Column('company_name', sa.String, nullable=False),
        sa.Column('city', sa.String, nullable=False),
        sa.Column('judge_name', sa.String, nullable=True),
        sa.Column('duty_amount', sa.Numeric, nullable=False, default=0),
        sa.Column('penalty_amount', sa.Numeric, nullable=False, default=0),
        sa.Column('attorney_fee', sa.Numeric, nullable=False, default=0),
        sa.Column('total_amount', sa.Numeric, nullable=False, default=0),
        sa.Column('status', sa.String, nullable=False, default='pending'),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create index on claim status
    op.create_index('ix_claim_expenses_status', 'claim_expenses', ['status'])
    op.create_index('ix_claim_expenses_bin', 'claim_expenses', ['bin'])


def downgrade() -> None:
    op.drop_index('ix_claim_expenses_bin', table_name='claim_expenses')
    op.drop_index('ix_claim_expenses_status', table_name='claim_expenses')
    op.drop_table('claim_expenses')
    op.drop_column('calculations', 'anomaly_explanation')
    op.drop_column('calculations', 'branch')
    op.drop_column('users', 'full_name')
    op.drop_column('users', 'branch')
