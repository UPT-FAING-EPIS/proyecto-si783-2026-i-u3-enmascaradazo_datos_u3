from enum import Enum


class GraphElementKind(str, Enum):
    """Tipo de elemento Neo4j sobre el que aplica una regla.

    NODE: la regla apunta a un label de nodo y a una propiedad del nodo.
    RELATIONSHIP: la regla apunta a un tipo de relacion y a una propiedad de la relacion.
    """

    NODE = "node"
    RELATIONSHIP = "relationship"
