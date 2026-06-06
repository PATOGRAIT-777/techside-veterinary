create table if not exists comportamientos
(
    id             uuid    default uuid_generate_v4() not null
        primary key,
    nombre         text                               not null
        unique,
    requiere_bozal boolean default false
);

alter table comportamientos
    owner to postgres;

