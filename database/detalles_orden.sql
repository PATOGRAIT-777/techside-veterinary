create table if not exists detalles_orden
(
    id              uuid default uuid_generate_v4() not null
        primary key,
    orden_id        uuid
        references ordenes
            on delete cascade,
    producto_id     uuid
        references productos,
    cantidad        integer                         not null,
    precio_unitario numeric                         not null
);

alter table detalles_orden
    owner to postgres;

