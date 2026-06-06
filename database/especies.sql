create table if not exists especies
(
    id     uuid default uuid_generate_v4() not null
        primary key,
    nombre text                            not null
        unique
);

alter table especies
    owner to postgres;

