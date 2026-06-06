create table if not exists archivos
(
    id             uuid                     default uuid_generate_v4() not null
        primary key,
    url            text                                                not null,
    nombre_archivo text,
    mime           text,
    tamano         integer,
    subido_en      timestamp with time zone default now()
);

alter table archivos
    owner to postgres;

