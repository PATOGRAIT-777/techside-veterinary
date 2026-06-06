create table if not exists citas
(
    id             uuid default uuid_generate_v4() not null
        primary key,
    sucursal_id    uuid
        references sucursales,
    medico_id      uuid
        references medicos,
    mascota_id     uuid
        references mascotas,
    consultorio_id uuid
        references consultorios,
    servicio_id    uuid
        references servicios,
    fecha          date                            not null,
    hora_inicio    time                            not null,
    estado         text default 'pendiente'::text,
    motivo         text
);

alter table citas
    owner to postgres;

