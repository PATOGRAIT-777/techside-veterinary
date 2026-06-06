create table if not exists medico_horarios
(
    id          uuid default uuid_generate_v4() not null
        primary key,
    medico_id   uuid
        references medicos
            on delete cascade,
    dia_semana  integer
        constraint medico_horarios_dia_semana_check
            check ((dia_semana >= 0) AND (dia_semana <= 6)),
    hora_inicio time                            not null,
    hora_fin    time                            not null,
    constraint horario_unico_medico
        unique (medico_id, dia_semana, hora_inicio)
);

alter table medico_horarios
    owner to postgres;

