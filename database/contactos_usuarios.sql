create table if not exists contactos_usuarios
(
    id         uuid                     default uuid_generate_v4() not null
        primary key,
    usuario_id uuid
        references usuarios
            on delete cascade,
    nombre     text                                                not null,
    relacion   text,
    telefono   text                                                not null,
    creado_en  timestamp with time zone default now()
);

alter table contactos_usuarios
    owner to postgres;

create index if not exists idx_contactos_usuario
    on contactos_usuarios (usuario_id);

