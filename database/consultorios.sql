create table if not exists consultorios
(
    id           uuid default uuid_generate_v4() not null
        primary key,
    sucursal_id  uuid
        references sucursales
            on delete cascade,
    nombre       text                            not null,
    equipamiento text
);

alter table consultorios
    owner to postgres;

