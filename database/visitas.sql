create table if not exists visitas
(
    id           uuid                     default uuid_generate_v4() not null
        primary key,
    cita_id      uuid
        references citas,
    mascota_id   uuid
        references mascotas,
    medico_id    uuid
        references medicos,
    atendido_en  timestamp with time zone default now(),
    diagnostico  text,
    tratamiento  text,
    receta_texto text
);

alter table visitas
    owner to postgres;

