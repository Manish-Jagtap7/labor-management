"""Add approval status and KYC document fields to provider profile

Revision ID: e7f2a18b9c43
Revises: 062dcdd284a0
Create Date: 2026-10-23 20:37:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7f2a18b9c43'
down_revision: Union[str, Sequence[str], None] = '062dcdd284a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('provider_profiles') as batch_op:
        batch_op.add_column(sa.Column('aadhaar_card_url', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('pan_card_url', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('approval_status', sa.String(), nullable=True, server_default='pending'))
        batch_op.add_column(sa.Column('rejection_reason', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('provider_profiles') as batch_op:
        batch_op.drop_column('rejection_reason')
        batch_op.drop_column('approval_status')
        batch_op.drop_column('pan_card_url')
        batch_op.drop_column('aadhaar_card_url')
