create table if not exists usuarios
(
    id            uuid                     default uuid_generate_v4() not null
        primary key,
    id_persona    uuid
        references persona
            on delete cascade,
    email         text                                                not null
        unique,
    password_hash text                                                not null,
    rol           text                                                not null
        constraint usuarios_rol_check
            check (rol = ANY (ARRAY ['cliente'::text, 'medico'::text, 'admin'::text])),
    estado        text                                                not null
        constraint usuarios_estado_check
            check (estado = ANY (ARRAY ['activo'::text, 'inactivo'::text, 'pendiente'::text])),
    creado_en     timestamp with time zone default now()
);

alter table usuarios
    owner to postgres;

