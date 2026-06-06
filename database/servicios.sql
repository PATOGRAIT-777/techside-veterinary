create table if not exists servicios
(
    id          uuid    default uuid_generate_v4() not null
        primary key,
    nombre      text                               not null
        unique,
    precio_base numeric default 0
);

alter table servicios
    owner to postgres;

