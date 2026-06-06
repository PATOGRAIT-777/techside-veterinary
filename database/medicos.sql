create table if not exists medicos
(
    id                        uuid default uuid_generate_v4() not null
        primary key,
    usuario_id                uuid
        references usuarios
            on delete cascade,
    sucursal_id               uuid
        references sucursales,
    especialidad_principal_id uuid
        references especialidades,
    cedula_profesional        text,
    biografia_corta           text
);

alter table medicos
    owner to postgres;

