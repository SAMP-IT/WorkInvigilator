from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class TeamCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str]
    parent_team_id: Optional[UUID]
    manager_id: Optional[UUID]


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str]
    parent_team_id: Optional[UUID]
    manager_id: Optional[UUID]
    is_active: Optional[bool]


class TeamMemberAdd(BaseModel):
    user_id: UUID
    role: str = "member"


class TeamResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    description: Optional[str]
    parent_team_id: Optional[UUID]
    manager_id: Optional[UUID]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TeamMemberResponse(BaseModel):
    id: UUID
    team_id: UUID
    user_id: UUID
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class PermissionResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    resource: str
    action: str

    class Config:
        from_attributes = True


class RoleCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str]
    permission_ids: List[UUID] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str]
    permission_ids: Optional[List[UUID]]


class RoleResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    description: Optional[str]
    is_system_role: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserRoleAssign(BaseModel):
    user_id: UUID
    role_id: UUID
