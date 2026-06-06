create table if not exists ordenes
(
    id              uuid                     default uuid_generate_v4() not null
        primary key,
    usuario_id      uuid
        references usuarios,
    sucursal_id     uuid
        references sucursales,
    fecha_compra    timestamp with time zone default now(),
    total           numeric                                             not null,
    estado          text
        constraint ordenes_estado_check
            check (estado = ANY
                   (ARRAY ['pendiente_pago'::text, 'pagado'::text, 'en_preparacion'::text, 'enviado'::text, 'entregado'::text, 'cancelado'::text, 'devolucion'::text])),
    metodo_pago     text,
    direccion_envio text                                                not null
);

alter table ordenes
    owner to postgres;

