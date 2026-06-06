create table if not exists patrones_pelo
(
    id     uuid default uuid_generate_v4() not null
        primary key,
    nombre text                            not null
        unique
);

alter table patrones_pelo
    owner to postgres;

