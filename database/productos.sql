create table if not exists productos
(
    id              uuid    default uuid_generate_v4() not null
        primary key,
    codigo_sku      text
        unique,
    nombre          text                               not null,
    descripcion     text,
    precio_venta    numeric                            not null,
    costo_compra    numeric,
    categoria_id    uuid
        references categorias_producto,
    es_medicamento  boolean default false,
    requiere_receta boolean default false,
    imagen_url      text,
    marca           text,
    activo          boolean default true
);

alter table productos
    owner to postgres;

