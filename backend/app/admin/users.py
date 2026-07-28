from collections.abc import Sequence
from typing import Any, ClassVar

from sqladmin import ModelView

from app.db.models.user import UserModel


class UserAdmin(ModelView, model=UserModel):
    column_list: ClassVar[Sequence[Any]] = [
        UserModel.id,
        UserModel.email,
        UserModel.username,
        UserModel.role,
        UserModel.is_active,
        UserModel.created_at,
    ]
    column_searchable_list: ClassVar[Sequence[Any]] = [
        UserModel.email,
        UserModel.username,
        UserModel.display_name,
    ]
    column_sortable_list: ClassVar[Sequence[Any]] = [
        UserModel.created_at,
        UserModel.email,
        UserModel.username,
    ]
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-users"
