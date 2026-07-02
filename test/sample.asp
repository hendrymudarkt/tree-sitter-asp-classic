<%@ Language="VBScript" CodePage="65001" %>
<%
Option Explicit
Response.Buffer = True
%>
<!DOCTYPE html>
<html>
<head>
    <title>Test ASP Classic</title>
</head>
<body>

<%
' === Demo ASP Classic untuk SiPS / PetaPanen ===

Dim conn, rs, strSQL
Dim afdeling, blok, tph

' Buka koneksi Oracle
On Error Resume Next
Set conn = Server.CreateObject("ADODB.Connection")
conn.Open "Provider=OraOLEDB.Oracle;Data Source=SIDB;User ID=sips;Password=pass;"

If Err.Number <> 0 Then
    Response.Write "Error koneksi: " & Err.Description
    Response.End
End If
On Error GoTo 0

' Ambil data panen per afdeling
strSQL = "SELECT afdeling, blok, janjang, kg_bruto " & _
         "FROM VIEW_PANEN_GAD " & _
         "WHERE TRUNC(tgl_panen) = TRUNC(SYSDATE) " & _
         "ORDER BY afdeling, blok"

Set rs = Server.CreateObject("ADODB.Recordset")
rs.Open strSQL, conn
%>

<table border="1">
    <thead>
        <tr>
            <th>Afdeling</th>
            <th>Blok</th>
            <th>Janjang</th>
            <th>Kg Bruto</th>
        </tr>
    </thead>
    <tbody>
    <%
    Dim totalJanjang, totalKg
    totalJanjang = 0
    totalKg = 0

    Do While Not rs.EOF
        afdeling = rs("afdeling")
        blok = rs("blok")
    %>
        <tr>
            <td><%= afdeling %></td>
            <td><%= blok %></td>
            <td><%= rs("janjang") %></td>
            <td><%= FormatNumber(rs("kg_bruto"), 2) %></td>
        </tr>
    <%
        totalJanjang = totalJanjang + rs("janjang")
        totalKg = totalKg + rs("kg_bruto")
        rs.MoveNext
    Loop
    %>
        <tr>
            <td colspan="2"><strong>TOTAL</strong></td>
            <td><strong><%= totalJanjang %></strong></td>
            <td><strong><%= FormatNumber(totalKg, 2) %></strong></td>
        </tr>
    </tbody>
</table>

<%
rs.Close
Set rs = Nothing
conn.Close
Set conn = Nothing
%>

<%
' === Contoh fungsi helper ===

Function FormatTanggal(dtDate)
    If IsDate(dtDate) Then
        FormatTanggal = Day(dtDate) & "/" & Month(dtDate) & "/" & Year(dtDate)
    Else
        FormatTanggal = "-"
    End If
End Function

Sub LogActivity(strUser, strAction)
    Dim connLog
    Set connLog = Server.CreateObject("ADODB.Connection")
    connLog.Open Application("connStr")
    connLog.Execute "INSERT INTO LOG_ACTIVITY (usr, aksi, tgl) " & _
                   "VALUES ('" & strUser & "', '" & strAction & "', SYSDATE)"
    connLog.Close
    Set connLog = Nothing
End Sub

' === Session check ===
If Session("USER_ID") = "" Then
    Response.Redirect "/login.asp"
End If

Dim userName
userName = Session("USER_NAME")
%>

<p>Selamat datang, <strong><%= Server.HTMLEncode(userName) %></strong></p>
<p>Tanggal: <%= FormatTanggal(Now()) %></p>

<!--#include file="footer.asp"-->

</body>
</html>
