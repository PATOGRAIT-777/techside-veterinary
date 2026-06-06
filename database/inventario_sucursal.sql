create table if not exists inventario_sucursal
(
    id                   uuid                     default uuid_generate_v4() not null
        primary key,
    sucursal_id          uuid
        references sucursales,
    producto_id          uuid
        references productos,
    cantidad_existencia  integer                  default 0,
    stock_minimo         integer                  default 5,
    ubicacion_en_almacen text,
    fecha_actualizacion  timestamp with time zone default now(),
    constraint unico_producto_sucursal
        unique (sucursal_id, producto_id)
);

alter table inventario_sucursal
    owner to postgres;

