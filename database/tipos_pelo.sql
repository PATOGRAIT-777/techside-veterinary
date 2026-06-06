create table if not exists tipos_pelo
(
    id     uuid default uuid_generate_v4() not null
        primary key,
    nombre text                            not null
        unique
);

alter table tipos_pelo
    owner to postgres;

