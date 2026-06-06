create table if not exists mx_divisiones
(
    id            uuid default uuid_generate_v4() not null
        primary key,
    codigo_postal text                            not null,
    colonia       text                            not null,
    municipio     text                            not null,
    estado        text                            not null
);

alter table mx_divisiones
    owner to postgres;

create index if not exists idx_mx_cp
    on mx_divisiones (codigo_postal);

