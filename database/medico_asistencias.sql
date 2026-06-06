create table if not exists medico_asistencias
(
    id                uuid                     default uuid_generate_v4() not null
        primary key,
    medico_id         uuid
        references medicos
            on delete cascade,
    fecha             date                                                not null,
    hora_entrada_real time,
    hora_salida_real  time,
    estado            text
        constraint medico_asistencias_estado_check
            check (estado = ANY
                   (ARRAY ['Asistencia'::text, 'Falta'::text, 'Retardo'::text, 'Justificado'::text, 'Incapacidad'::text])),
    observaciones     text,
    creado_en         timestamp with time zone default now()
);

alter table medico_asistencias
    owner to postgres;

