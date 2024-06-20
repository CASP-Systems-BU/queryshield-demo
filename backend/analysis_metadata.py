from enum import Enum
from typing import List, NamedTuple, Optional


class SecurityLevel(Enum):
    SEMI = "semi"   # semi-honest
    MAL = "mal"  # malicious

    @classmethod
    def from_str(cls, value: str) -> 'SecurityLevel':
        for member in cls:
            if member.value.lower() == value.lower():
                return member
        raise ValueError(f"{value} is not a valid {cls.__name__}")


class CloudProvider(Enum):
    AWS = "aws"
    GCP = "gcp"
    AZURE = "azure"
    CHAMELEON = "chameleon"

    @classmethod
    def from_str(cls, value: str) -> 'CloudProvider':
        for member in cls:
            if member.value.lower() == value.lower():
                return member
        raise ValueError(f"{value} is not a valid {cls.__name__}")


class AnalysisMetadata(NamedTuple):
    analysis_name: str
    query_sql: str
    security_level: SecurityLevel
    cloud_providers: List[CloudProvider]
    # schema: Dict[str, str]    # schema is not necessary for queryshield, since it can be inferred from data.


def parse_cloud_provider_strs(cloud_provider_strs: List[str]) -> List[CloudProvider]:
    cloud_provider_enums = []
    # cloud provider strs -> cloud provider enums
    for cloud_provider_str in cloud_provider_strs:
        cloud_provider_enum = CloudProvider.from_str(cloud_provider_str)
        cloud_provider_enums.append(cloud_provider_enum)

    return cloud_provider_enums
